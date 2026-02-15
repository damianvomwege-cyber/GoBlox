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

    createGameInstance(game, canvasOrContainer) {
        const tmpl = templates[game.templateName];
        if (!tmpl) throw new Error(`Template "${game.templateName}" not found`);
        // For 3D games, use the 3D class if available; pass container div
        if (game.is3D && tmpl.class3D) {
            return new tmpl.class3D(canvasOrContainer, game.config);
        }
        return new tmpl.class(canvasOrContainer, game.config);
    },

    registerTemplate3D(name, templateClass2D, templateClass3D, variationGenerator) {
        templates[name] = { class: templateClass2D, class3D: templateClass3D, generator: variationGenerator };
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
