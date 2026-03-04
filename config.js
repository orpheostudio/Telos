// config.js
const config = {
    supabase: {
        url: 'YOUR_SUPABASE_URL',
        anonKey: 'YOUR_SUPABASE_ANON_KEY'
    },
    mistral: {
        apiKey: 'NFuAj8PYUPcaf6tA1BjbyXuIeSjSA4sW',
        apiUrl: 'https://api.mistral.ai/v1/chat/completions'
    },
    app: {
        name: 'Telos AI',
        termsUrl: 'https://termos.cici.net.br',
        privacyUrl: 'https://privacidade.cici.net.br',
        dailyFreeCredits: 10,
        plans: {
            free: { credits: 300, price: 0 },
            basic: { credits: 1000, price: 89.99 },
            pro: { credits: 50000, price: 199.99 }
        }
    }
};
