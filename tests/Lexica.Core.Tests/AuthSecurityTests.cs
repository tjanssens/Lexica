using Lexica.Api.Controllers;
using Lexica.Api.Security;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.FileProviders;
using Microsoft.Extensions.Hosting;

namespace Lexica.Core.Tests;

public class AuthSecurityTests
{
    [Fact]
    public void GooglePayloadHeeftGeverifieerdeEmailNodig()
    {
        Assert.False(AuthController.AcceptsGooglePayload("user@example.com", emailVerified: false));
    }

    [Fact]
    public void GooglePayloadMetGeverifieerdeEmailIsAcceptabel()
    {
        Assert.True(AuthController.AcceptsGooglePayload("user@example.com", emailVerified: true));
    }

    [Fact]
    public void PasswordResetTokensZijnEenUurGeldig()
    {
        Assert.Equal(TimeSpan.FromHours(1), AuthSecurityOptions.PasswordResetTokenLifespan);
    }

    [Fact]
    public void JwtDevelopmentKeyMagNietInProductie()
    {
        var configuration = NewConfiguration(AuthSecurityOptions.DevelopmentJwtKey);
        var environment = new TestHostEnvironment { EnvironmentName = Environments.Production };

        Assert.Throws<InvalidOperationException>(() => AuthSecurityOptions.GetJwtSigningKey(configuration, environment));
    }

    [Fact]
    public void JwtDevelopmentKeyMagWelInDevelopment()
    {
        var configuration = NewConfiguration(AuthSecurityOptions.DevelopmentJwtKey);
        var environment = new TestHostEnvironment { EnvironmentName = Environments.Development };

        Assert.Equal(AuthSecurityOptions.DevelopmentJwtKey, AuthSecurityOptions.GetJwtSigningKey(configuration, environment));
    }

    [Fact]
    public void JwtSigningKeyMoetMinstens32BytesZijn()
    {
        var configuration = NewConfiguration("short");
        var environment = new TestHostEnvironment { EnvironmentName = Environments.Development };

        Assert.Throws<InvalidOperationException>(() => AuthSecurityOptions.GetJwtSigningKey(configuration, environment));
    }

    [Fact]
    public void AuthControllerGebruiktRateLimitPolicy()
    {
        var attribute = Assert.Single(typeof(AuthController)
            .GetCustomAttributes(typeof(EnableRateLimitingAttribute), inherit: true)
            .Cast<EnableRateLimitingAttribute>());

        Assert.Equal(AuthSecurityOptions.AuthRateLimitPolicy, attribute.PolicyName);
    }

    [Fact]
    public void AuthRateLimitStaatOpTwintigPogingenPerMinuut()
    {
        Assert.Equal(20, AuthSecurityOptions.AuthRateLimitPermitLimit);
        Assert.Equal(TimeSpan.FromMinutes(1), AuthSecurityOptions.AuthRateLimitWindow);
    }

    private static IConfiguration NewConfiguration(string key) =>
        new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["Jwt:Key"] = key
            })
            .Build();

    private sealed class TestHostEnvironment : IHostEnvironment
    {
        public string EnvironmentName { get; set; } = Environments.Development;
        public string ApplicationName { get; set; } = "Lexica.Tests";
        public string ContentRootPath { get; set; } = "";
        public IFileProvider ContentRootFileProvider { get; set; } = new NullFileProvider();
    }
}
