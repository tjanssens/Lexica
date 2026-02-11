namespace Lexica.Core.Entities;

public class SetWord
{
    public Guid SetId { get; set; }
    public Guid WordId { get; set; }
    public DateTime AddedAt { get; set; } = DateTime.UtcNow;

    public Set Set { get; set; } = null!;
    public Word Word { get; set; } = null!;
}
