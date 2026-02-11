namespace Lexica.Shared.DTOs;

public record WordDto(
    Guid Id,
    int Number,
    string Language,
    string Term,
    string Translation,
    string? PartOfSpeech,
    string? Notes,
    double Easiness,
    int Interval,
    int Repetitions,
    DateTime DueDate,
    DateTime? LastReviewed,
    int TimesReviewed,
    bool IsOwner = true
);

public record CreateWordRequest(
    int Number,
    string Language,
    string Term,
    string Translation,
    string? PartOfSpeech,
    string? Notes
);

public record UpdateWordRequest(
    int? Number,
    string? Term,
    string? Translation,
    string? PartOfSpeech,
    string? Notes
);
