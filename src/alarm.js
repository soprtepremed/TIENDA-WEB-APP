export const Alarm = {
    check: (tasks) => {
        const now = new Date();
        const currentDay = now.getDay(); // 0-6
        const currentDate = now.getDate(); // 1-31

        const currentHours = String(now.getHours()).padStart(2, '0');
        const currentMinutes = String(now.getMinutes()).padStart(2, '0');
        const currentTime = `${currentHours}:${currentMinutes}`;

        const triggeredTasks = tasks.filter(task => {
            // 1. Check Time
            if (task.time !== currentTime) return false;

            // 2. Check Start Date (must be today or past)
            // task.startDate is YYYY-MM-DD
            if (task.startDate) {
                // Create date objects for comparison (set time to 00:00:00)*
                // Parse YYYY-MM-DD manually to avoid timezone issues or use simple string comparison if format is consistent
                const [y, m, d] = task.startDate.split('-').map(Number);
                const start = new Date(y, m - 1, d);
                const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

                if (todayStart < start) return false;

                // 3. Check Recurrence
                switch (task.recurrenceType) {
                    case 'daily':
                        return true;

                    case 'weekly':
                        // Match day of week
                        return start.getDay() === currentDay;

                    case 'monthly':
                        // Match day of month
                        return start.getDate() === currentDate;

                    case 'custom':
                        return task.customDays && task.customDays.includes(currentDay);

                    default:
                        // Fallback
                        return false;
                }
            } else {
                // Legacy support: just check days array if it exists
                return task.days && task.days.includes(currentDay);
            }
        });

        return triggeredTasks;
    }
};
