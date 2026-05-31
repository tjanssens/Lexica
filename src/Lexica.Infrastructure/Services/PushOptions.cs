namespace Lexica.Infrastructure.Services;

public class PushOptions
{
    public const string SectionName = "Push";

    /// <summary>VAPID-subject: een mailto:-adres of https-URL van de afzender.</summary>
    public string Subject { get; set; } = "";
    public string PublicKey { get; set; } = "";
    public string PrivateKey { get; set; } = "";
}
