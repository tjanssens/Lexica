namespace Lexica.Shared.DTOs;

public record SessionRequest(
    List<Guid> GroupIds,
    string Direction,
    int? SessionSize
);

public record SessionWordDto(
    Guid WordId,
    string Term,
    string Translation,
    string? PartOfSpeech,
    string? Notes,
    bool IsNew
);

public record ReviewRequest(
    Guid WordId,
    string Direction,
    string Result
);

public record ReviewResponse(
    Guid WordId,
    double NewEasiness,
    int NewInterval,
    DateTime NewDueDate,
    int XpEarned
);

public record SessionSummaryDto(
    int TotalWords,
    int KnownCount,
    int UnknownCount,
    int EasyCount,
    int XpEarned,
    double Accuracy
);
