namespace Lexica.Shared.DTOs;

public record ImportPreviewRow(
    int RowNumber,
    int Number,
    string Language,
    string Term,
    string Translation,
    string? PartOfSpeech,
    string? Notes,
    double? Easiness,
    int? Interval,
    int? Repetitions,
    DateTime? DueDate,
    string? Group,
    bool IsDuplicate,
    List<string> Errors
);

public record ImportPreviewResponse(
    List<ImportPreviewRow> Rows,
    int ValidCount,
    int DuplicateCount,
    int ErrorCount,
    string SessionId
);

public record ImportConfirmRequest(
    string SessionId,
    bool UpdateDuplicates
);

public record ImportResultResponse(
    int Imported,
    int Updated,
    int Skipped,
    int Errors
);
