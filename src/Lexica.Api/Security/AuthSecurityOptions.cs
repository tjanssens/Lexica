using System.Text;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Hosting;

namespace Lexica.Api.Security;

public static class AuthSecurityOptions
{
    public const string DevelopmentJwtKey = "LexicaSuperSecretKeyForDevelopment2024!MinLength32Chars";
    public const string AuthRateLimitPolicy = "auth";
    public const int AuthRateLimitPermitLimit = 20;

    public static readonly TimeSpan PasswordResetTokenLifespan = TimeSpan.FromHours(1);
    public static readonly TimeSpan AuthRateLimitWindow = TimeSpan.FromMinutes(1);

    public static string GetJwtSigningKey(IConfiguration configuration, IHostEnvironment environment)
    {
        var key = configuration["Jwt:Key"];
        if (string.IsNullOrWhiteSpace(key))
            throw new InvalidOperationException("Jwt:Key must be configured.");

        if (Encoding.UTF8.GetByteCount(key) < 32)
            throw new InvalidOperationException("Jwt:Key must be at least 32 bytes.");

        if (!environment.IsDevelopment() && key == DevelopmentJwtKey)
            throw new InvalidOperationException("The development Jwt:Key cannot be used outside Development.");

        return key;
    }
}
