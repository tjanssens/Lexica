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

// Language is enkel nodig bij de algemene import (zonder set); in een set geldt de taal van de set.
public record ImportRowsPreviewRequest(List<ImportRowInput> Rows, string? Language = null);

// De (term, vertaling)-paren die Claude op een foto herkende, nog niet geïmporteerd.
public record PhotoImportResponse(List<PhotoWordRow> Rows);

// Een woordje zoals Claude het op de foto las. Uncertain = Claude twijfelt (slecht leesbaar,
// afgesneden, onduidelijke kolom, ...); Reason legt in het Nederlands kort uit waarom.
public record PhotoWordRow(string? Term, string? Translation, bool Uncertain = false, string? Reason = null);
