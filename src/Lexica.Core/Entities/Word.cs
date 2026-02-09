using Lexica.Core.Enums;

namespace Lexica.Core.Entities;

public class Word
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public int Number { get; set; }
    public Language Language { get; set; }
    public string Term { get; set; } = string.Empty;
    public string Translation { get; set; } = string.Empty;
    public string? PartOfSpeech { get; set; }
    public string? Notes { get; set; }

    // SM-2 fields
    public double Easiness { get; set; } = 2.5;
    public int Interval { get; set; }
    public int Repetitions { get; set; }
    public DateTime DueDate { get; set; } = DateTime.UtcNow.Date;
    public DateTime? LastReviewed { get; set; }
    public int TimesReviewed { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public ApplicationUser User { get; set; } = null!;
    public ICollection<GroupWord> GroupWords { get; set; } = [];
    public ICollection<ReviewLog> ReviewLogs { get; set; } = [];
}
