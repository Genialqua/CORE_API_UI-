import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environments';

@Injectable({
  providedIn: 'root',
})
export class CoreApiService {
  private readonly http = inject(HttpClient);

  private readonly baseUrl = environment.coreApiUrl;

  private readonly headers = new HttpHeaders({
    Authorization: `Bearer ${environment.coreApiKey}`,
    'Content-Type': 'application/json',
    Accept: 'application/json',
  });

  searchWorks(payload: {
    q: string;
    limit?: number;
    offset?: number;
  }): Observable<any> {
    return this.http.post(
      `${this.baseUrl}/search/works`,
      payload,
      { headers: this.headers }
    );
  }
}