using Microsoft.AspNetCore.Identity;

namespace Lexica.Core.Entities;

public class ApplicationUser : IdentityUser<Guid>
{
    public string? DisplayName { get; set; }
    public string? ProfilePictureUrl { get; set; }
    public int Xp { get; set; }
    public int Level { get; set; } = 1;
    public int Streak { get; set; }
    public DateTime? LastSessionDate { get; set; }
    public bool StreakFreezeAvailable { get; set; }
    public int SessionSize { get; set; } = 20;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public ICollection<Word> Words { get; set; } = [];
    public ICollection<Group> Groups { get; set; } = [];
    public ICollection<Achievement> Achievements { get; set; } = [];
    public ICollection<SetSubscription> SetSubscriptions { get; set; } = [];
}
