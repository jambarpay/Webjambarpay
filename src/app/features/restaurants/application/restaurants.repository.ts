import { InjectionToken } from '@angular/core';
import { Observable } from 'rxjs';
import { Restaurant } from '../domain/restaurant.model';

export interface RestaurantsRepository {
  list(): Observable<Restaurant[]>;
  saveAll(restaurants: readonly Restaurant[]): Observable<void>;
  upsert(restaurant: Restaurant): Observable<Restaurant>;
  activate(id: string): Observable<Restaurant>;
  suspend(id: string): Observable<Restaurant>;
  delete(id: string): Observable<void>;
}

export const RESTAURANTS_REPOSITORY = new InjectionToken<RestaurantsRepository>('RESTAURANTS_REPOSITORY');
