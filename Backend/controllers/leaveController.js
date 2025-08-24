import sql from '../db.js';

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

    // Validate leave balance
    const currentYear = new Date().getFullYear();
    let [leaveBalance] = await sql`
      SELECT * FROM leave_entitlements 
      WHERE user_id = ${req.user.userId} AND year = ${currentYear}
    `;

    // If no entitlements found, create them
    if (!leaveBalance) {
      console.log('Creating missing leave entitlements for user:', req.user.userId);
      
      // Get user's employment type
      const [userDetails] = await sql`
        SELECT ed.employment_type, ed.confirmation_date 
        FROM employee_details ed
        WHERE ed.user_id = ${req.user.userId}
      `;

      let annualEntitlement = 0;
      let casualEntitlement = 0;

      if (userDetails?.employment_type === 'confirmed' && userDetails?.confirmation_date) {
        const quarter = Math.floor((new Date(userDetails.confirmation_date).getMonth() + 3) / 3);
        annualEntitlement = [14, 10, 7, 4][quarter - 1] || 0;
        casualEntitlement = 7;
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

    // Check leave balance based on leave type
    if (leave_type === 'casual') {
      if (total_days > leaveBalance.casual_leave_remaining) {
        return res.status(400).json({ 
          message: `Not enough casual leave balance. Available: ${leaveBalance.casual_leave_remaining}, Requested: ${total_days}` 
        });
      }
    } else if (leave_type === 'annual') {
      if (total_days > leaveBalance.annual_leave_remaining) {
        return res.status(400).json({ 
          message: `Not enough annual leave balance. Available: ${leaveBalance.annual_leave_remaining}, Requested: ${total_days}` 
        });
      }
    }

    // Insert leave application
    const [leave] = await sql`
      INSERT INTO leaves (
        user_id, leave_type, start_date, end_date, total_days, status,
        casual_leave_type, which_half, short_leave_out_time, short_leave_in_time,
        other_leave_type, has_attended_bots, attended_bots_count, bots_monitor,
        email_autoforward, has_client_calls, call_leader, passwords_on_lastpass,
        passwords_shared, projects, comments, job_handover_person, manager_id
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
        ${req.user.manager_id || null}
      ) RETURNING *
    `;

    console.log('Leave application created successfully:', leave);

    res.status(201).json({ 
      message: 'Leave application submitted successfully',
      leave 
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
      SELECT * FROM leave_entitlements 
      WHERE user_id = ${req.user.userId} AND year = ${currentYear}
    `;

    // If no balance found, create default entitlements
    if (!balance) {
      console.log('No leave balance found, creating default entitlements for user:', req.user.userId);
      
      // Get user details to determine proper entitlements
      const [userDetails] = await sql`
        SELECT ed.employment_type, ed.confirmation_date 
        FROM employee_details ed
        WHERE ed.user_id = ${req.user.userId}
      `;

      let annualEntitlement = 0;
      let casualEntitlement = 0;

      if (userDetails?.employment_type === 'confirmed' && userDetails?.confirmation_date) {
        const quarter = Math.floor((new Date(userDetails.confirmation_date).getMonth() + 3) / 3);
        annualEntitlement = [14, 10, 7, 4][quarter - 1] || 0;
        casualEntitlement = 7;
      } else {
        // Default to probation values if no employment type found
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