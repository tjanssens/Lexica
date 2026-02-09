namespace Lexica.Shared.DTOs;

public record GroupDto(
    Guid Id,
    string Name,
    string Language,
    string DefaultDirection,
    int WordCount,
    int MasteredWordCount,
    int InProgressWordCount,
    DateTime CreatedAt
);

public record CreateGroupRequest(
    string Name,
    string Language,
    string DefaultDirection,
    int? FromNumber,
    int? ToNumber
);

public record UpdateGroupRequest(
    string? Name,
    string? DefaultDirection
);

public record AddWordsToGroupRequest(
    List<Guid>? WordIds,
    int? FromNumber,
    int? ToNumber
);
