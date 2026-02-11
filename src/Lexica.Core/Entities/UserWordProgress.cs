namespace Lexica.Core.Entities;

public class UserWordProgress
{
    public Guid UserId { get; set; }
    public Guid WordId { get; set; }

    // SM-2 fields
    public double Easiness { get; set; } = 2.5;
    public int Interval { get; set; }
    public int Repetitions { get; set; }
    public DateTime DueDate { get; set; } = DateTime.UtcNow.Date;
    public DateTime? LastReviewed { get; set; }
    public int TimesReviewed { get; set; }

    // Per-user notes
    public string? Notes { get; set; }

    public ApplicationUser User { get; set; } = null!;
    public Word Word { get; set; } = null!;
}
