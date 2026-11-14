namespace Lexica.Shared.DTOs;

public record ImportPreviewRow(
    int RowNumber,
    int? OriginalNumber,
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
    bool NumberChanged,
    List<string> Errors,
    bool AlreadyInSet = false
);

public record ImportPreviewResponse(
    List<ImportPreviewRow> Rows,
    int ValidCount,
    int DuplicateCount,
    int ErrorCount,
    int RenumberedCount,
    string SessionId,
    int ToAddToSetCount = 0
);

public record ImportConfirmRequest(
    string SessionId,
    bool UpdateDuplicates
);

public record ImportResultResponse(
    int Imported,
    int Updated,
    int Skipped,
    int Errors,
    int AddedToSet = 0
);

// Een (term, vertaling)-paar dat niet uit Excel komt, bv. herkend op een foto en nagekeken door de gebruiker.
public record ImportRowInput(string? Term, string? Translation);

public record ImportRowsPreviewRequest(List<ImportRowInput> Rows);

// De (term, vertaling)-paren die Claude op een foto herkende, nog niet geïmporteerd.
public record PhotoImportResponse(List<ImportRowInput> Rows);
