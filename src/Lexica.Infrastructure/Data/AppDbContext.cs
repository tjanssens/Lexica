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
    public DbSet<Set> Sets => Set<Set>();
    public DbSet<SetWord> SetWords => Set<SetWord>();
    public DbSet<SetSubscription> SetSubscriptions => Set<SetSubscription>();
    public DbSet<UserWordProgress> UserWordProgress => Set<UserWordProgress>();
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

        // Set
        builder.Entity<Set>(e =>
        {
            e.HasKey(s => s.Id);
            e.HasOne(s => s.User).WithMany().HasForeignKey(s => s.UserId).OnDelete(DeleteBehavior.Cascade);
            e.Property(s => s.Language).HasConversion<string>();
            e.Property(s => s.DefaultDirection).HasConversion<string>();
        });

        // SetWord (many-to-many)
        builder.Entity<SetWord>(e =>
        {
            e.HasKey(sw => new { sw.SetId, sw.WordId });
            e.HasOne(sw => sw.Set).WithMany(s => s.SetWords).HasForeignKey(sw => sw.SetId).OnDelete(DeleteBehavior.Cascade);
            e.HasOne(sw => sw.Word).WithMany(w => w.SetWords).HasForeignKey(sw => sw.WordId).OnDelete(DeleteBehavior.NoAction);
        });

        // SetSubscription
        builder.Entity<SetSubscription>(e =>
        {
            e.HasKey(ss => new { ss.UserId, ss.SetId });
            e.HasOne(ss => ss.User).WithMany(u => u.SetSubscriptions).HasForeignKey(ss => ss.UserId).OnDelete(DeleteBehavior.NoAction);
            e.HasOne(ss => ss.Set).WithMany(s => s.Subscriptions).HasForeignKey(ss => ss.SetId).OnDelete(DeleteBehavior.NoAction);
        });

        // UserWordProgress
        builder.Entity<UserWordProgress>(e =>
        {
            e.HasKey(p => new { p.UserId, p.WordId });
            e.HasOne(p => p.User).WithMany().HasForeignKey(p => p.UserId).OnDelete(DeleteBehavior.NoAction);
            e.HasOne(p => p.Word).WithMany(w => w.UserProgress).HasForeignKey(p => p.WordId).OnDelete(DeleteBehavior.NoAction);
        });
    }
}
