import sql from '../db.js';
import cron from 'node-cron';

export const accrueMonthlyLeaves = async () => {
  console.log('Running monthly leave accrual process...');
  
  try {
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth() + 1;
    const currentYear = currentDate.getFullYear();

    // Get all probation and internship employees
    const probationEmployees = await sql`
      SELECT u.id as user_id, ed.employment_type, ed.confirmation_date,
             ed.probation_start_date, ed.last_accrual_date
      FROM users u
      JOIN employee_details ed ON u.id = ed.user_id
      WHERE ed.employment_type IN ('probation', 'internship')
    `;

    for (const employee of probationEmployees) {
      await processEmployeeAccrual(employee, currentMonth, currentYear);
    }

    console.log('Monthly leave accrual process completed successfully');
  } catch (error) {
    console.error('Error in monthly leave accrual:', error);
  }
};

const processEmployeeAccrual = async (employee, currentMonth, currentYear) => {
  const { user_id, employment_type, probation_start_date, last_accrual_date } = employee;

  // Check if employee has completed at least one month
  const startDate = new Date(probation_start_date || last_accrual_date);
  const monthsCompleted = calculateMonthsCompleted(startDate);

  if (monthsCompleted > 0) {
    // Get current leave balance
    const [currentEntitlement] = await sql`
      SELECT casual_leave_remaining, casual_leave_entitled 
      FROM leave_entitlements 
      WHERE user_id = ${user_id} AND year = ${currentYear}
    `;

    if (!currentEntitlement) {
      console.log(`No leave entitlements found for user ${user_id}, creating...`);
      await initializeProbationEntitlements(user_id, currentYear);
    }

    // Calculate new entitlement (1 leave per completed month + previous balance)
    const newEntitlement = monthsCompleted;
    const newBalance = (currentEntitlement?.casual_leave_remaining || 0) + monthsCompleted;

    // Update leave entitlements
    await sql`
      UPDATE leave_entitlements 
      SET 
        casual_leave_entitled = ${newEntitlement},
        casual_leave_remaining = ${newBalance},
        updated_at = CURRENT_TIMESTAMP
      WHERE user_id = ${user_id} AND year = ${currentYear}
    `;

    // Record the accrual
    await sql`
      INSERT INTO monthly_leave_accruals (
        user_id, month, casual_leave_earned, casual_leave_balance
      ) VALUES (
        ${user_id}, ${new Date(currentYear, currentMonth - 1, 1)}, 
        ${monthsCompleted}, ${newBalance}
      )
    `;

    // Update last accrual date
    await sql`
      UPDATE employee_details 
      SET last_accrual_date = CURRENT_DATE,
          updated_at = CURRENT_TIMESTAMP
      WHERE user_id = ${user_id}
    `;

    console.log(`Accrued ${monthsCompleted} leaves for user ${user_id}. New balance: ${newBalance}`);
  }
};

const calculateMonthsCompleted = (startDate) => {
  const today = new Date();
  const start = new Date(startDate);
  
  let months = (today.getFullYear() - start.getFullYear()) * 12;
  months -= start.getMonth();
  months += today.getMonth();
  
  return months <= 0 ? 0 : months;
};

const initializeProbationEntitlements = async (userId, year) => {
  await sql`
    INSERT INTO leave_entitlements (
      user_id, year, annual_leave_entitled, annual_leave_remaining,
      casual_leave_entitled, casual_leave_remaining,
      maternity_leave_entitled, paternity_leave_entitled, birthday_leave_entitled
    ) VALUES (
      ${userId}, ${year}, 0, 0, 0, 0, 0, 0, 1
    )
  `;
};

// Schedule monthly accrual (run on 1st of every month)
cron.schedule('0 0 1 * *', () => {
  accrueMonthlyLeaves();
});

console.log('Monthly leave accrual scheduler started');