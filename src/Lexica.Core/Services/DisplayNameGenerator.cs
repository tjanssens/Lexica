namespace Lexica.Core.Services;

public static class DisplayNameGenerator
{
    private static readonly string[] Tituli =
    [
        "Discipulus", "Scriba", "Lector", "Rhetor", "Magister",
        "Philosophus", "Poeta", "Grammaticus", "Scholaris", "Peregrinus",
        "Navigator", "Cursor", "Augur", "Artifex", "Viator",
        "Legatus", "Praeco", "Cantor", "Faber", "Aedilis"
    ];

    private static readonly string[] Epitheta =
    [
        "Audax", "Felix", "Sapiens", "Fortis", "Prudens",
        "Acer", "Callidus", "Doctus", "Fidelis", "Illustris",
        "Nobilis", "Strenuus", "Validus", "Alacer", "Benignus",
        "Clemens", "Facundus", "Iucundus", "Luculentus", "Perspicax"
    ];

    /// <summary>
    /// Generates a classical-sounding display name.
    /// Uses the email as a seed for deterministic but unique results.
    /// </summary>
    public static string Generate(string? email)
    {
        var hash = GetStableHash(email ?? Guid.NewGuid().ToString());
        var titulus = Tituli[Math.Abs(hash) % Tituli.Length];
        var epitheton = Epitheta[Math.Abs(hash / Tituli.Length) % Epitheta.Length];
        return $"{titulus} {epitheton}";
    }

    private static int GetStableHash(string input)
    {
        unchecked
        {
            int hash = 17;
            foreach (char c in input)
                hash = hash * 31 + c;
            return hash;
        }
    }
}
