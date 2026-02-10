using Lexica.Core.Entities;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;

namespace Lexica.Infrastructure.Data;

public class AppDbContext : IdentityDbContext<ApplicationUser, IdentityRole<Guid>, Guid>
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    public DbSet<Word> Words => Set<Word>();
    public DbSet<Group> Groups => Set<Group>();
    public DbSet<GroupWord> GroupWords => Set<GroupWord>();
    public DbSet<ReviewLog> ReviewLogs => Set<ReviewLog>();
    public DbSet<Achievement> Achievements => Set<Achievement>();

    protected override void OnModelCreating(ModelBuilder builder)
    {
        base.OnModelCreating(builder);

        // Word
        builder.Entity<Word>(e =>
        {
            e.HasKey(w => w.Id);
            e.HasIndex(w => new { w.UserId, w.Language, w.Number }).IsUnique();
            e.HasOne(w => w.User).WithMany(u => u.Words).HasForeignKey(w => w.UserId).OnDelete(DeleteBehavior.Cascade);
            e.Property(w => w.Language).HasConversion<string>();
        });

        // Group
        builder.Entity<Group>(e =>
        {
            e.HasKey(g => g.Id);
            e.HasOne(g => g.User).WithMany(u => u.Groups).HasForeignKey(g => g.UserId).OnDelete(DeleteBehavior.Cascade);
            e.Property(g => g.Language).HasConversion<string>();
            e.Property(g => g.DefaultDirection).HasConversion<string>();
        });

        // GroupWord (many-to-many)
        builder.Entity<GroupWord>(e =>
        {
            e.HasKey(gw => new { gw.GroupId, gw.WordId });
            e.HasOne(gw => gw.Group).WithMany(g => g.GroupWords).HasForeignKey(gw => gw.GroupId).OnDelete(DeleteBehavior.Cascade);
            e.HasOne(gw => gw.Word).WithMany(w => w.GroupWords).HasForeignKey(gw => gw.WordId).OnDelete(DeleteBehavior.NoAction);
        });

        // ReviewLog
        builder.Entity<ReviewLog>(e =>
        {
            e.HasKey(r => r.Id);
            e.HasOne(r => r.Word).WithMany(w => w.ReviewLogs).HasForeignKey(r => r.WordId).OnDelete(DeleteBehavior.NoAction);
            e.Property(r => r.Direction).HasConversion<string>();
            e.Property(r => r.Result).HasConversion<string>();
        });

        // Achievement
        builder.Entity<Achievement>(e =>
        {
            e.HasKey(a => a.Id);
            e.HasOne(a => a.User).WithMany(u => u.Achievements).HasForeignKey(a => a.UserId).OnDelete(DeleteBehavior.Cascade);
        });
    }
}
