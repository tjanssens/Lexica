namespace Lexica.Shared.DTOs;

public record SetDto(
    Guid Id,
    string Name,
    string Language,
    string DefaultDirection,
    int WordCount,
    int MasteredWordCount,
    int InProgressWordCount,
    DateTime CreatedAt,
    bool IsPublic,
    string? Description,
    bool IsOwner,
    string? OwnerName,
    string? OwnerPictureUrl,
    int SubscriberCount
);

public record PublicSetDto(
    Guid Id,
    string Name,
    string Language,
    string? Description,
    int WordCount,
    string? OwnerName,
    string? OwnerPictureUrl,
    int SubscriberCount,
    bool IsSubscribed
);

public record CreateSetRequest(
    string Name,
    string Language,
    string DefaultDirection,
    int? FromNumber,
    int? ToNumber
);

public record UpdateSetRequest(
    string? Name,
    string? DefaultDirection,
    bool? IsPublic,
    string? Description
);

public record AddWordsToSetRequest(
    List<Guid>? WordIds,
    int? FromNumber,
    int? ToNumber
);

public record SplitSetRequest(
    string Name,
    List<Guid> WordIds,
    string Mode // "move" | "copy"
);

public record MergeSetsRequest(
    string Name,
    List<Guid> SetIds,
    bool DeleteOriginals
);

public record MoveWordsRequest(
    Guid FromSetId,
    Guid ToSetId,
    List<Guid> WordIds,
    string Mode // "move" | "copy"
);
