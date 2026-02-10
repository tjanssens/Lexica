using Lexica.Core.Enums;

namespace Lexica.Core.Entities;

public class Group
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public string Name { get; set; } = string.Empty;
    public Language Language { get; set; }
    public Direction DefaultDirection { get; set; } = Direction.NlToTarget;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public ApplicationUser User { get; set; } = null!;
    public ICollection<GroupWord> GroupWords { get; set; } = [];
}
