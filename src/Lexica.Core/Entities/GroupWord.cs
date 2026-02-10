namespace Lexica.Core.Entities;

public class GroupWord
{
    public Guid GroupId { get; set; }
    public Guid WordId { get; set; }
    public DateTime AddedAt { get; set; } = DateTime.UtcNow;

    public Group Group { get; set; } = null!;
    public Word Word { get; set; } = null!;
}
