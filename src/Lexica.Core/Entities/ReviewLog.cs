using Lexica.Core.Enums;

namespace Lexica.Core.Entities;

public class ReviewLog
{
    public Guid Id { get; set; }
    public Guid WordId { get; set; }
    public DateTime ReviewedAt { get; set; } = DateTime.UtcNow;
    public Direction Direction { get; set; }
    public ReviewResult Result { get; set; }
    public double EasinessBefore { get; set; }
    public double EasinessAfter { get; set; }
    public int IntervalAfter { get; set; }

    public Word Word { get; set; } = null!;
}
