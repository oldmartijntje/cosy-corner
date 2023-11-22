import { Component, OnInit } from '@angular/core';
import { BackendServiceService } from 'src/app/services/backend-service.service';

@Component({
    selector: 'app-not-found-page',
    templateUrl: './not-found-page.component.html',
    styleUrls: ['./not-found-page.component.scss']
})
export class NotFoundPageComponent implements OnInit {

    constructor(private backendServiceService: BackendServiceService) { }

    ngOnInit(): void {
        this.getMessages();
    }

    click(): void {
        this.backendServiceService.addMessage('Test', 'Test').subscribe((data) => {
            console.log(data);
            this.getMessages();
        });
    }

    getMessages(): void {
        this.backendServiceService.getMessages().subscribe((data) => {
            console.log(data);
        });
    }

}
