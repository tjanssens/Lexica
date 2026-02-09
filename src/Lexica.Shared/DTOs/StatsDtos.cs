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
    int DueToday,
    List<AchievementDto> Achievements
);

public record AchievementDto(
    string Type,
    string Title,
    DateTime UnlockedAt
);
