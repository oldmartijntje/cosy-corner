import { ChangeDetectionStrategy, Component, OnInit, ViewEncapsulation } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { Router } from '@angular/router';
import { bookmarks, applications, taskBar } from 'src/app/data/applications';
import { Settings, PageInfo } from '../../../data/settings';
import { CdkDragRelease, CdkDragStart } from '@angular/cdk/drag-drop';
import { environment } from 'src/environments/environment';
import { Shortcut } from 'src/app/models/applications';
import { smallAd } from 'src/app/data/ads';
import { AdHandler } from 'src/app/models/adHandler';
import { RuntimeServiceService } from 'src/app/services/runtime-service.service';

@Component({
    selector: 'app-application-page',
    templateUrl: './application-page.component.html',
    styleUrls: ['./application-page.component.scss'],
})
export class ApplicationPageComponent implements OnInit {

    divs: { left: string; top: string, id: number, zIndex: number }[] = [];
    bookmarks: Record<string, any>[] = [];
    lastId: number = -1;
    randomX = 50;
    randomY = 50;
    showRouter: boolean = false;
    activePage = "";
    isBlockDraggable = false;
    pageInfo: Record<string, any>[] = [];
    mobileMode: { [key: string]: any } = {
        "MobileUser": false,
        "MobileMode": false
    };
    devMode = !environment.production;
    applications: Shortcut[] = []
    isDragging = false;
    private clickStartTime!: number;
    lastGrabbedId: number = 9;
    navBar: Shortcut[] = [];


    constructor(
        private router: Router,
        private runtimeServiceService: RuntimeServiceService,
        private sanitizer: DomSanitizer
    ) { }

    ngOnInit(): void {
        this.bookmarks = bookmarks;
        for (let i = 0; i < bookmarks.length; i++) {
            this.lastId += 1;
            this.checkBookmarkForMissingData(this.bookmarks[i]);
        }
        for (let i = 0; i < bookmarks.length; i++) {
            const left = `${Math.random() * this.randomX}`; // Adjust the range as needed
            const top = `${Math.random() * this.randomY}`; // Adjust the range as needed
            const zIndex = this.setNewZIndex();
            this.divs.push({ left, top, id: i, zIndex });
        }
        for (let i = 0; i < applications.length; i++) {
            try {
                this.lastId += 1;
                this.addIdToBookmark(applications[i]);
            } catch (error) {

            }

        }
        this.router.events.subscribe(event => {
            const currentUrl = this.router.url; // Get the full URL
            const currentPathWithoutQueryParams = currentUrl.split('?')[0].substring(1); // Extract the path
            this.activePage = currentPathWithoutQueryParams;
            if (Settings["inWindowsRouter"].includes(currentPathWithoutQueryParams)) {
                this.showRouter = true;
            } else {
                this.showRouter = false;
            }
        });
        this.runtimeServiceService.mobileModeSubjectValue$.subscribe((value) => {
            this.mobileMode = value;
        });
        this.pageInfo = [...PageInfo];
        this.applications = [...applications];
        this.navBar = [...taskBar];
    }
    onWindowDragStarted(event: CdkDragStart<any>) {
        this.setNewZIndex();

        const draggedElement = event.source.element.nativeElement;
        draggedElement.style.setProperty('z-index', `${this.lastGrabbedId}`, 'important');
    }
    onWindowDragReleased(event: CdkDragRelease<any>) {
        const draggedElement = event.source.element.nativeElement;
        //draggedElement.style.zIndex = '3';
    }

    setNewZIndex() {
        if (this.lastGrabbedId < this.lastId) {
            this.lastGrabbedId = this.lastId + 1;
        } else {
            this.lastGrabbedId++;
        }
        return this.lastGrabbedId;
    }

    dragStarted() {
        this.isDragging = true;
    }

    dragEnded() {
        this.isDragging = false;
    }

    onMouseDown() {
        this.clickStartTime = Date.now();
    }

    onMouseUp(onIcon: boolean, button: any, bookmark: Record<string, any>) {
        const clickDuration = Date.now() - this.clickStartTime;

        // Define your threshold for short click duration (e.g., 300 milliseconds)
        const shortClickThreshold = 300;

        if (!this.isDragging && clickDuration < shortClickThreshold && onIcon) {
            this.executeCommand(button, bookmark)
        }
    }

    switchPage(newPage: string): void {
        this.activePage = newPage;
        this.router.navigate([newPage]);
    }

    setMobileMode(value: boolean) {
        localStorage.setItem("MobileMode", value.toString());
        this.runtimeServiceService.setMobileMode(value);
    }

    getWindowSize(bookmark: Record<string, any>, defaultWidth: string): string {
        if (bookmark["Size"] == undefined) {
            return defaultWidth;
        } else {
            return bookmark["Size"]["Width"];
        }
    }

    toggleMinimisedWindow(bookmark: Record<string, any>): void {
        bookmark["Minimised"] = !bookmark["Minimised"];
    }

    devInfo(bookmark: Record<string, any>): void {
        console.log(bookmark);
    }

    addIdToBookmark(bookmark: Record<string, any>): void {
        bookmark["Id"] = this.lastId;
    }

    checkBookmarkForMissingData(bookmark: Record<string, any>): void {
        this.addIdToBookmark(bookmark);
        if (bookmark["Minimised"] == undefined) {
            bookmark["Minimised"] = false;
        }
        if (bookmark["ActiveTabId"] == undefined) {
            bookmark["ActiveTabId"] = 0;
        }
        if (bookmark["CloseButton"] == undefined) {
            bookmark["CloseButton"] = {
                "Command": "close",
                "Link": ""
            };
        }
        if (bookmark["Size"] == undefined) {
            bookmark["Size"] = {
                "Width": "400px"
            };
        }
        if (bookmark["Type"] == undefined) {
            bookmark["Type"] = "WinXP";
        }
        if (bookmark["Tabs"] != undefined) {
            for (let j = 0; j < bookmark["Tabs"].length; j++) {
                bookmark["Tabs"][j]["Id"] = j;
            }
        }
    }

    trustHTML(html: string): any {
        return this.sanitizer.bypassSecurityTrustHtml(html);
    }

    getTrustedUrl(url: string): SafeResourceUrl {
        // Use DomSanitizer to mark the URL as trusted
        return this.sanitizer.bypassSecurityTrustResourceUrl(url);
    }

    goToWebPage(url: string, openInNewTab: boolean = false): void {
        if (openInNewTab) {
            window.open(url, '_blank');
        } else {
            window.location.href = url;
        }
    }

    executeCommand(button: any, bookmark: Record<string, any>): void {
        if (button['Command'].toLocaleLowerCase() == "close") {
            this.deleteBookmark(bookmark["Id"]);
        } else if (button['Command'].toLocaleLowerCase() == "nav") {
            this.goToWebPage(button['Link']);
        } else if (button['Command'].toLocaleLowerCase() == "virus") {
            this.virus(bookmark, bookmark)
        } else if (button['Command'].toLocaleLowerCase() == "opennewtab") {
            this.reCreateBookmark(button['Payload'], bookmark)
        } else if (button['Command'].toLocaleLowerCase() == "opensinglenewtab") {
            if (!this.checkForOpenTabWithValue(button['Payload']['SinglePageId'])) {
                this.reCreateBookmark(button['Payload'], bookmark)
            } else {
                this.toggleHiddenById(button['Payload']['SinglePageId']);
            }
        }
    }

    toggleHiddenById(id: string): void {
        const index = this.bookmarks.findIndex(bookmark => bookmark['SinglePageId'] === id);

        if (index !== -1) {
            this.bookmarks[index]["Minimised"] = !this.bookmarks[index]["Minimised"];
        }
    }

    checkForOpenTabWithValue(id: string) {
        const index = this.bookmarks.findIndex(bookmark => bookmark['SinglePageId'] === id);

        if (index !== -1) {
            return true;
        }
        return false;
    }

    virus(bookmark: Record<string, any>, parent: Record<string, any>): void {
        var calcAmount = 0;
        if (this.lastId == 0) {
            calcAmount = 1;
        } else if (this.lastId > 10) {
            calcAmount = 10;
        } else {
            calcAmount = this.lastId;
        }
        const amount = calcAmount;
        for (let index = 0; index < amount; index++) {
            this.reCreateBookmark(bookmark, parent)

        }
    }

    reCreateBookmark(bookmark: Record<string, any>, parent: Record<string, any>): void {
        this.lastId++;
        var newBookmark = { ...bookmark };
        if (parent["ParentId"] == undefined) {
            newBookmark["ParentId"] = parent["Id"];
        } else {
            newBookmark["ParentId"] = parent["ParentId"];
        }
        this.checkBookmarkForMissingData(newBookmark);
        this.bookmarks.push({ ...newBookmark });
        const left = `${Math.random() * this.randomX}`; // Adjust the range as needed
        const top = `${Math.random() * this.randomY}`; // Adjust the range as needed
        this.divs.push({ left, top, id: this.lastId, zIndex: this.setNewZIndex() });
    }

    routerNav(routeSegments: string[]): void {
        // Navigate to the specified route
        this.router.navigate(routeSegments);
    }

    setActiveTab(tabId: number, bookmark: Record<string, any>): void {
        bookmark["ActiveTabId"] = tabId;
    }

    isActiveTab(tabId: string, bookmarkId: string, bookmark: any): boolean {
        return bookmark['ActiveTabId'] == tabId;
    }

    deleteBookmark(bookmarkId: number): void {
        const index = this.bookmarks.findIndex(bookmark => bookmark['Id'] === bookmarkId);

        if (index !== -1) {
            this.bookmarks.splice(index, 1);
        }
        const divs = this.divs.findIndex(bookmark => bookmark.id === bookmarkId);

        if (divs !== -1) {
            this.divs.splice(divs, 1);
        }
    }

    getDivById(id: number): { left: string; top: string, id: number, zIndex: number } {
        var divFound = this.divs.find(div => div.id === id);
        if (divFound == undefined) {
            return { left: `${Math.random() * this.randomX}`, top: `${Math.random() * this.randomY}`, id: 0, zIndex: this.setNewZIndex() };
        }
        return { ...divFound };
    }

    deleteLocalStorage() {
        localStorage.clear();
    }

    getListOfSmallAds(): smallAd[] {
        var adHandler = new AdHandler();
        return adHandler.getSmallAdList();
    }

    sendToLink(ad: smallAd): void {
        var adHandler = new AdHandler();
        adHandler.sendToLink(ad);
    }

    ngForScroll() {
        var adHandler = new AdHandler();
        return adHandler.ngForScroll();
    }

    calculateWidth(): string {
        var width = `${this.getListOfSmallAds().length * 88 * 3}`
        return width
    }

    hasNonEmptyLink(ad: smallAd): any {
        var adHandler = new AdHandler();
        if (adHandler.hasNonEmptyLink(ad)) {
            return { 'cursor': 'pointer' }
        }
    }
}
