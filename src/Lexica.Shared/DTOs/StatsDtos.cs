namespace Lexica.Shared.DTOs;

public record UserStatsDto(
    int Xp,
    int Level,
    string LevelTitle,
    int XpForNextLevel,
    int Streak,
    bool StreakFreezeAvailable,
    int TotalWords,
    int MasteredWords,
    int InProgressWords,
    int DueToday,
    List<AchievementDto> Achievements
);

public record AchievementDto(
    string Type,
    string Title,
    DateTime UnlockedAt
);

public record DayStatsDto(
    DateTime Date,
    int TotalReviews,
    int Known,
    int Easy,
    int Unknown
);

public record WeeklyStatsDto(
    List<DayStatsDto> Days,
    int CurrentStreak
);
