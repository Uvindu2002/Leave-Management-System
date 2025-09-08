import sql from '../db.js';

// Helper function to calculate months completed
const calculateMonthsCompleted = (startDate) => {
  const today = new Date();
  const start = new Date(startDate);
  
  let months = (today.getFullYear() - start.getFullYear()) * 12;
  months -= start.getMonth();
  months += today.getMonth();
  
  return months <= 0 ? 0 : months;
};

// NEW: Helper to count already-used non-paid days in current month (approved + pending)
const getUsedNonPaidDaysThisMonth = async (userId) => {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  const [row] = await sql`
    SELECT COALESCE(SUM(non_paid_days), 0) AS used
    FROM leaves
    WHERE user_id = ${userId}
      AND is_non_paid = true
      AND status IN ('approved', 'pending')
      AND start_date >= ${startOfMonth}
      AND start_date <= ${endOfMonth}
  `;
  return Number(row?.used || 0);
};

// UPDATED: Helper function to check probation/confirmed leave eligibility
const checkProbationLeaveEligibility = async (userId, leaveType, totalDays, currentYear) => {
  // Only enforce splitting logic on casual leaves
  if (leaveType !== 'casual') {
    return { eligible: true, paidDays: totalDays, nonPaidDays: 0, allowedNonPaidLeft: 0 };
  }

  // Get user employment type and current balance
  const [userDetails] = await sql`
    SELECT ed.employment_type, le.casual_leave_remaining
    FROM employee_details ed
    LEFT JOIN leave_entitlements le ON ed.user_id = le.user_id 
      AND le.year = ${currentYear}
    WHERE ed.user_id = ${userId}
  `;


  const availablePaidLeaves = Number(userDetails?.casual_leave_remaining || 0);
  const paidDays = Math.min(Number(totalDays), availablePaidLeaves);
  const nonPaidDays = Math.max(0, Number(totalDays) - paidDays);

  // No monthly non-paid day limit
  return {
    eligible: true,
    paidDays,
    nonPaidDays,
    allowedNonPaidLeft: null
  };
};

export const applyForLeave = async (req, res) => {
  try {
    console.log('Leave application request received:', req.body);
    console.log('User making request:', req.user);

    const {
      leave_type,
      start_date,
      end_date,
      total_days,
      casual_leave_type,
      which_half,
      short_leave_out_time,
      short_leave_in_time,
      other_leave_type,
      has_attended_bots,
      attended_bots_count,
      bots_monitor,
      email_autoforward,
      has_client_calls,
      call_leader,
      passwords_on_lastpass,
      passwords_shared,
      projects,
      comments,
      job_handover_person
    } = req.body;

    // Validate required fields
    if (!leave_type || !start_date || !end_date || !job_handover_person) {
      return res.status(400).json({ 
        message: 'Missing required fields: leave_type, start_date, end_date, or job_handover_person' 
      });
    }

    const currentYear = new Date().getFullYear();
    
    // Check leave eligibility
    const eligibility = await checkProbationLeaveEligibility(
      req.user.userId, 
      leave_type, 
      total_days,
      currentYear
    );

    if (!eligibility.eligible) {
      return res.status(400).json({ 
        message: `Leave request exceeds allowed limits. Non-paid days left this month: ${eligibility.allowedNonPaidLeft ?? 0}. Available paid leaves to apply: ${eligibility.paidDays}. Requested total: ${total_days}`
      });
    }

    // Get or create leave balance
    let [leaveBalance] = await sql`
      SELECT * FROM leave_entitlements 
      WHERE user_id = ${req.user.userId} AND year = ${currentYear}
    `;

    if (!leaveBalance) {
      console.log('Creating missing leave entitlements for user:', req.user.userId);
      
      // Get user's employment type
      const [userDetails] = await sql`
        SELECT ed.employment_type, ed.confirmation_date, ed.probation_start_date
        FROM employee_details ed
        WHERE ed.user_id = ${req.user.userId}
      `;

      let annualEntitlement = 0;
      let casualEntitlement = 0;

      if (userDetails?.employment_type === 'confirmed' && userDetails?.confirmation_date) {
        const quarter = Math.floor((new Date(userDetails.confirmation_date).getMonth() + 3) / 3);
        annualEntitlement = [14, 10, 7, 4][quarter - 1] || 0;
        casualEntitlement = 7;
      } else if (userDetails?.employment_type === 'probation' || userDetails?.employment_type === 'internship') {
        // For probation/internship, calculate based on months completed
        const startDate = new Date(userDetails?.probation_start_date || new Date());
        const monthsCompleted = calculateMonthsCompleted(startDate);
        casualEntitlement = monthsCompleted;
      } else {
        casualEntitlement = 1;
      }

      [leaveBalance] = await sql`
        INSERT INTO leave_entitlements (
          user_id, year, annual_leave_entitled, annual_leave_remaining,
          casual_leave_entitled, casual_leave_remaining,
          maternity_leave_entitled, paternity_leave_entitled, birthday_leave_entitled
        ) VALUES (
          ${req.user.userId}, ${currentYear}, ${annualEntitlement}, ${annualEntitlement},
          ${casualEntitlement}, ${casualEntitlement},
          0, 0, 1
        ) RETURNING *
      `;
    }

    // Update leave balance if it's a paid leave
    if (eligibility.paidDays > 0) {
      if (leave_type === 'casual') {
        await sql`
          UPDATE leave_entitlements 
          SET casual_leave_remaining = casual_leave_remaining - ${eligibility.paidDays},
              casual_leave_taken = COALESCE(casual_leave_taken, 0) + ${eligibility.paidDays},
              updated_at = CURRENT_TIMESTAMP
          WHERE user_id = ${req.user.userId} AND year = ${currentYear}
        `;
      } else if (leave_type === 'annual') {
        await sql`
          UPDATE leave_entitlements 
          SET annual_leave_remaining = annual_leave_remaining - ${eligibility.paidDays},
              annual_leave_taken = COALESCE(annual_leave_taken, 0) + ${eligibility.paidDays},
              updated_at = CURRENT_TIMESTAMP
          WHERE user_id = ${req.user.userId} AND year = ${currentYear}
        `;
      }
    }

    // Insert leave application
    const [leave] = await sql`
      INSERT INTO leaves (
        user_id, leave_type, start_date, end_date, total_days, status,
        casual_leave_type, which_half, short_leave_out_time, short_leave_in_time,
        other_leave_type, has_attended_bots, attended_bots_count, bots_monitor,
        email_autoforward, has_client_calls, call_leader, passwords_on_lastpass,
        passwords_shared, projects, comments, job_handover_person, manager_id,
        is_non_paid, paid_days, non_paid_days
      ) VALUES (
        ${req.user.userId}, ${leave_type}, ${start_date}, ${end_date}, ${total_days}, 'pending',
        ${casual_leave_type || null}, ${which_half || null}, 
        ${short_leave_out_time || null}, ${short_leave_in_time || null},
        ${other_leave_type || null}, ${has_attended_bots || false}, 
        ${attended_bots_count || 0}, ${bots_monitor || null},
        ${email_autoforward || false}, ${has_client_calls || false}, 
        ${call_leader || null}, ${passwords_on_lastpass || false},
        ${passwords_shared || false}, ${projects || null}, 
        ${comments || null}, ${job_handover_person}, 
        ${req.user.manager_id || null},
        ${eligibility.nonPaidDays > 0}, 
        ${eligibility.paidDays}, 
        ${eligibility.nonPaidDays}
      ) RETURNING *
    `;

    console.log('Leave application created successfully:', leave);

    res.status(201).json({ 
      message: 'Leave application submitted successfully',
      leave,
      paidDays: eligibility.paidDays,
      nonPaidDays: eligibility.nonPaidDays
    });

  } catch (error) {
    console.error('Apply for leave error:', error);
    res.status(500).json({ 
      message: 'Server error: ' + error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

export const getLeaveBalance = async (req, res) => {
  try {
    console.log('Fetching leave balance for user:', req.user.userId);
    
    const currentYear = new Date().getFullYear();
    let [balance] = await sql`
      SELECT le.*, ed.employment_type, ed.probation_start_date
      FROM leave_entitlements le
      LEFT JOIN employee_details ed ON le.user_id = ed.user_id
      WHERE le.user_id = ${req.user.userId} AND le.year = ${currentYear}
    `;

    const casualLeavesHistoryRow = await sql`
      SELECT *
      FROM leaves
      WHERE user_id = ${req.user.userId}
        AND leave_type = 'casual'
    `;
    if (casualLeavesHistoryRow) {
      balance = {
        ...balance,
        casual_leaves_history: casualLeavesHistoryRow
      };
    } else {
      balance = {
        ...balance,
        casual_leaves_history: ''
      };
    }



    // If no balance found, create default entitlements
    if (!balance) {
      console.log('No leave balance found, creating default entitlements for user:', req.user.userId);
      
      // Get user details to determine proper entitlements
      const [userDetails] = await sql`
        SELECT ed.employment_type, ed.confirmation_date, ed.probation_start_date
        FROM employee_details ed
        WHERE ed.user_id = ${req.user.userId}
      `;

      let annualEntitlement = 0;
      let casualEntitlement = 0;

      if (userDetails?.employment_type === 'confirmed' && userDetails?.confirmation_date) {
        const quarter = Math.floor((new Date(userDetails.confirmation_date).getMonth() + 3) / 3);
        annualEntitlement = [14, 10, 7, 4][quarter - 1] || 0;
        casualEntitlement = 7;
      } else if (userDetails?.employment_type === 'probation' || userDetails?.employment_type === 'internship') {
        // For probation/internship, calculate based on months completed
        const startDate = new Date(userDetails?.probation_start_date || new Date());
        const monthsCompleted = calculateMonthsCompleted(startDate);
        casualEntitlement = monthsCompleted;
      } else {
        casualEntitlement = 1;
      }

      [balance] = await sql`
        INSERT INTO leave_entitlements (
          user_id, year, annual_leave_entitled, annual_leave_remaining,
          casual_leave_entitled, casual_leave_remaining,
          maternity_leave_entitled, paternity_leave_entitled, birthday_leave_entitled
        ) VALUES (
          ${req.user.userId}, ${currentYear}, ${annualEntitlement}, ${annualEntitlement},
          ${casualEntitlement}, ${casualEntitlement},
          0, 0, 1
        ) RETURNING *
      `;
    }

    console.log('Leave balance fetched successfully:', balance);
    res.json(balance);

  } catch (error) {
    console.error('Get leave balance error:', error);
    res.status(500).json({ 
      message: 'Server error: ' + error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

export const getAllLeaves = async (req, res) => {
  try {
    const leaves = await sql`
      SELECT l.*, u.name as employee_name 
      FROM leaves l
      JOIN users u ON l.user_id = u.id
      ORDER BY l.start_date DESC
    `;
    res.json(leaves);
  } catch (error) {
    console.error('Get all leaves error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Manual leave accrual function for probation/internship employees
export const accrueMonthlyLeaves = async (req, res) => {
  try {
    console.log('Manual leave accrual triggered');
    
    const currentYear = new Date().getFullYear();
    
    // Get all probation and internship employees
    const probationEmployees = await sql`
      SELECT u.id as user_id, ed.employment_type, ed.probation_start_date
      FROM users u
      JOIN employee_details ed ON u.id = ed.user_id
      WHERE ed.employment_type IN ('probation', 'internship')
    `;

    let processedCount = 0;

    for (const employee of probationEmployees) {
      const { user_id, employment_type, probation_start_date } = employee;
      
      // Calculate months completed
      const startDate = new Date(probation_start_date || new Date());
      const monthsCompleted = calculateMonthsCompleted(startDate);

      if (monthsCompleted > 0) {
        // Get current leave balance
        const [currentEntitlement] = await sql`
          SELECT casual_leave_remaining, casual_leave_entitled 
          FROM leave_entitlements 
          WHERE user_id = ${user_id} AND year = ${currentYear}
        `;

        // Calculate new entitlement (1 leave per completed month)
        const newEntitlement = monthsCompleted;
        const newBalance = (currentEntitlement?.casual_leave_remaining || 0) + 1; // Add 1 leave for this month

        // Update leave entitlements
        await sql`
          UPDATE leave_entitlements 
          SET 
            casual_leave_entitled = ${newEntitlement},
            casual_leave_remaining = ${newBalance},
            updated_at = CURRENT_TIMESTAMP
          WHERE user_id = ${user_id} AND year = ${currentYear}
        `;

        processedCount++;
        console.log(`Accrued 1 leave for user ${user_id}. New balance: ${newBalance}`);
      }
    }

    res.json({ 
      message: `Monthly leave accrual completed. Processed ${processedCount} employees.` 
    });

  } catch (error) {
    console.error('Monthly leave accrual error:', error);
    res.status(500).json({ 
      message: 'Server error: ' + error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};