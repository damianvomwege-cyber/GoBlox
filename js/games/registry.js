const templates = {};
let allGames = [];
let catalogedTemplates = new Set();
let nextId = 1;

export const GameRegistry = {
    registerTemplate(name, templateClass, variationGenerator) {
        templates[name] = { class: templateClass, generator: variationGenerator };
    },

    buildCatalog() {
        // On first build, generate all variations, shuffle, and assign IDs.
        // On subsequent builds (phase 2 batches), only append new templates
        // so that existing game IDs remain stable.
        const newTemplates = Object.entries(templates)
            .filter(([name]) => !catalogedTemplates.has(name));

        if (newTemplates.length === 0) return allGames;

        const newGames = [];
        for (const [name, tmpl] of newTemplates) {
            const variations = tmpl.generator();
            for (const v of variations) {
                newGames.push({ ...v, templateName: name });
            }
            catalogedTemplates.add(name);
        }

        // Shuffle only the new games
        for (let i = newGames.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [newGames[i], newGames[j]] = [newGames[j], newGames[i]];
        }

        // Assign stable IDs starting from nextId
        for (const g of newGames) {
            g.id = nextId++;
        }

        allGames = allGames.concat(newGames);
        return allGames;
    },

    getAllGames() {
        if (allGames.length === 0) this.buildCatalog();
        return allGames;
    },

    getGame(id) {
        return this.getAllGames().find(g => g.id === parseInt(id));
    },

    async createGameInstance(game, canvasOrContainer) {
        let tmpl = templates[game.templateName];

        // If the template hasn't been loaded yet (e.g., it's in phase 2 and
        // background loading hasn't reached it), wait for all templates.
        if (!tmpl) {
            const { ensureAllTemplates } = await import('./loader.js');
            await ensureAllTemplates();
            tmpl = templates[game.templateName];
        }

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
