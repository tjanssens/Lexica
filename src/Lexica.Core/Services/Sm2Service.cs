using Lexica.Core.Enums;

namespace Lexica.Core.Services;

public static class Sm2Service
{
    public static (double NewEasiness, int NewInterval, int NewRepetitions, DateTime NewDueDate) Calculate(
        double easiness, int interval, int repetitions, ReviewResult result)
    {
        // Map result to SM-2 q-value
        int q = result switch
        {
            ReviewResult.Unknown => 1,
            ReviewResult.Known => 4,
            ReviewResult.Easy => 5,
            _ => 1
        };

        double newEasiness = easiness;
        int newInterval;
        int newRepetitions;

        if (q < 3) // Not known
        {
            // Reset
            newRepetitions = 0;
            newInterval = 1;
            newEasiness = Math.Max(1.3, easiness - 0.20);
        }
        else
        {
            // Known or easy
            newRepetitions = repetitions + 1;

            // EF adjustment
            if (q == 4) newEasiness = easiness + 0.10;
            else if (q == 5) newEasiness = easiness + 0.15;

            newEasiness = Math.Max(1.3, newEasiness);

            // Interval calculation
            if (newRepetitions == 1)
                newInterval = 1;
            else if (newRepetitions == 2)
                newInterval = 6;
            else
                newInterval = (int)Math.Ceiling(interval * newEasiness);
        }

        var newDueDate = DateTime.UtcNow.Date.AddDays(newInterval);

        return (
            Math.Round(newEasiness, 2),
            newInterval,
            newRepetitions,
            newDueDate
        );
    }
}
