﻿import app = require("durandal/app");
import dialog = require("plugins/dialog");
import appUrl = require("common/appUrl");
import viewModelBase = require("viewmodels/viewModelBase");
import dialogViewModelBase = require("viewmodels/dialogViewModelBase");
import database = require("models/database");
import durandalRouter = require("plugins/router");
import activator = require("durandal/activator");

class databaseSettingsDialog extends dialogViewModelBase {

    public dialogTask = $.Deferred();
//    router: DurandalRootRouter = null;
    routes: Array<{title:string; moduleId:string}>;
    appUrls: computedAppUrls;
    activeScreen: KnockoutObservable<string> = ko.observable<string>("");
    activeModel: KnockoutObservable<viewModelBase> = ko.observable<viewModelBase>(null);

    activeRoute = ko.observable<string>();

    bundleMap = { quotas: "Quotas", versioning: "Versioning" };
    userDatabasePages = ko.observableArray([]);

    dirtyFlag = new ko.DirtyFlag([]);

    content: DurandalActivator<any>;
    currentModel: viewModelBase;

    constructor(bundles: Array<string>) {
        super();

        this.content = activator.create();


        this.appUrls = appUrl.forCurrentDatabase();

        var quotasRoute = { moduleId: 'viewmodels/quotas', title: 'Quotas', activate: true};
        var versioningRoute = { moduleId: 'viewmodels/versioning', title: 'Versioning', activate: true};
        var sqlReplicationConnectionRoute = { moduleId: 'viewmodels/sqlReplicationConnectionStringsManagement', title: 'SQL Replication Connection Strings', activate: true};

        // when the activeScreen name changes - load the viewmodel
        this.activeScreen.subscribe((newValue) => 
            require([newValue], (model) => {
                //this.activeModel(new model());
                this.currentModel = new model();
                this.content.activateItem(this.currentModel);
            })
            );

        this.activeModel.subscribe(() => {
            debugger;
        });

        this.routes = [];
        if (bundles.contains("Quotas")) {
            this.routes.push(quotasRoute);
        }
        if (bundles.contains("Versioning")) {
            this.routes.push(versioningRoute);
        }
        if (bundles.contains("SqlReplication")) {
            this.routes.push(sqlReplicationConnectionRoute);
        }

    }

    attached() {
        this.dirtyFlag().reset();
        this.showView(this.routes[0].moduleId);
    }

    detached() {
        super.detached();
        this.dialogTask.resolve();
    }

    canDeactivate(): any {
        var isDirty = this.currentModel.dirtyFlag().isDirty();
        
        if (isDirty) {
            return this.confirmationMessage('Unsaved Data', 'You have unsaved data. Are you sure you want to continue?');
        }

        return true;
    }

    private confirmationMessage(title: string, confirmationMessage: string, options: string[]= ['No','Yes' ]): JQueryPromise<any> {
        var viewTask = $.Deferred();
        var messageView = app.showMessage(confirmationMessage, title, options);

        messageView.done((answer) => {
            if (answer == options[1]) {
                viewTask.resolve({ can: true });
            } else {
                viewTask.resolve({ can: false });
            }
        });

        return viewTask;
    }

    checkDirtyFlag(yesCallback: Function, noCallback?: Function) {
        var deferred: JQueryPromise<string>;
        if (this.dirtyFlag().isDirty()) {
            deferred = app.showMessage('You have unsaved data. Are you sure you want to close?', 'Unsaved Data', ['Yes', 'No']);
        } else {
            deferred = $.Deferred().resolve("Yes");
        }

        deferred.done((canDo: string) => {
            if (canDo === "Yes" && yesCallback) {
                yesCallback();
            } else if (canDo === "No" && noCallback) {
                noCallback();
            }
        });
    }

    showView(moduleId: string) {
        this.checkDirtyFlag(() => this.activeScreen(moduleId));
    }

    isActive(moduleId: string) {
        return moduleId === this.activeScreen();
    }

    close() {
        this.checkDirtyFlag(() => dialog.close(this));
    }
}

export = databaseSettingsDialog;