import durandalRouter = require("plugins/router");
import viewModelBase = require("viewmodels/viewModelBase");

class indexesShell extends viewModelBase {
    router: DurandalRootRouter;

    constructor() {
        super();

        this.router = durandalRouter.createChildRouter()
            .map([
                { route: 'databases/indexes', moduleId: 'viewmodels/indexes', title: 'Indexes', nav: true },
                { route: 'databases/indexes/edit(/:indexName)', moduleId: 'viewmodels/editIndex', title: 'Edit Index', nav: true },
                { route: 'databases/indexes/terms/(:indexName)', moduleId: 'viewmodels/indexTerms', title: 'Terms', nav: true }
            ])
            .buildNavigationModel();
    }

    static getRecentQueries(localStorageObjectName: string): storedQueryDto[] {
        var recentQueriesFromLocalStorage: storedQueryDto[] = localStorage.getObject(localStorageObjectName);
        var isArray = recentQueriesFromLocalStorage instanceof Array;

        if (recentQueriesFromLocalStorage == null || isArray == false) {
            localStorage.setObject(localStorageObjectName, []);
            recentQueriesFromLocalStorage = [];
        }

        return recentQueriesFromLocalStorage;
    }
}

export = indexesShell;