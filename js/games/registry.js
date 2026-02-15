const templates = {};
let allGames = [];

export const GameRegistry = {
    registerTemplate(name, templateClass, variationGenerator) {
        templates[name] = { class: templateClass, generator: variationGenerator };
    },

    buildCatalog() {
        allGames = [];
        let id = 1;
        for (const [name, tmpl] of Object.entries(templates)) {
            const variations = tmpl.generator();
            for (const v of variations) {
                allGames.push({ ...v, id: id++, templateName: name });
            }
        }
        // Shuffle for variety in browsing
        for (let i = allGames.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [allGames[i], allGames[j]] = [allGames[j], allGames[i]];
        }
        // Re-assign IDs after shuffle
        allGames.forEach((g, i) => g.id = i + 1);
        return allGames;
    },

    getAllGames() {
        if (allGames.length === 0) this.buildCatalog();
        return allGames;
    },

    getGame(id) {
        return this.getAllGames().find(g => g.id === parseInt(id));
    },

    createGameInstance(game, canvas) {
        const tmpl = templates[game.templateName];
        if (!tmpl) throw new Error(`Template "${game.templateName}" not found`);
        return new tmpl.class(canvas, game.config);
    },

    getCategories() {
        const cats = {};
        this.getAllGames().forEach(g => {
            cats[g.category] = (cats[g.category] || 0) + 1;
        });
        return Object.entries(cats)
            .sort((a, b) => b[1] - a[1])
            .map(([name, count]) => ({ name, count }));
    },

    getGamesByCategory(category) {
        return this.getAllGames().filter(g => g.category === category);
    },

    searchGames(query) {
        const q = query.toLowerCase();
        return this.getAllGames().filter(g =>
            g.name.toLowerCase().includes(q) ||
            g.category.toLowerCase().includes(q)
        );
    }
};
