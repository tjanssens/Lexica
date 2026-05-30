namespace Lexica.Infrastructure.Services;

public class PushOptions
{
    public const string SectionName = "Push";

    /// <summary>VAPID-subject: een mailto:-adres of https-URL van de afzender.</summary>
    public string Subject { get; set; } = "";
    public string PublicKey { get; set; } = "";
    public string PrivateKey { get; set; } = "";

    /// <summary>Uur (Europe/Brussels) waarop de dagelijkse herinnering vertrekt.</summary>
    public int ReminderHour { get; set; } = 16;

    /// <summary>Uur (Europe/Brussels) waarop de "nog niet geoefend"-nudge vertrekt.</summary>
    public int NudgeHour { get; set; } = 20;
}
