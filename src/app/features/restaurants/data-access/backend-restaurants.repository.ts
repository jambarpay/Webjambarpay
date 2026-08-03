import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { forkJoin, map, Observable, of, switchMap, throwError } from 'rxjs';
import { BACKEND_API_URL } from '../../../core/http/backend-api.config';
import { RestaurantsRepository } from '../application/restaurants.repository';
import { Restaurant } from '../domain/restaurant.model';

interface BackendRestaurantDto {
  id: string;
  name: string;
  registrationNumber: string;
  ownerId: string;
  phoneNumber: string;
  country: string;
  city: string;
  district: string;
  street: string;
  status: 'PENDING' | 'ACTIVE' | 'SUSPENDED';
  paymentEligibilityStatus: 'ELIGIBLE' | 'NOT_ELIGIBLE' | 'SUSPENDED';
}

interface CreateRestaurantDto {
  name: string;
  registrationNumber: string;
  ownerUserId: string;
  ownerFirstName: string;
  ownerLastName: string;
  ownerPhoneNumber: string;
  phoneNumber: string;
  country: string;
  city: string;
  district: string;
  street: string;
}

interface CreateRestaurantOwnerDto {
  phoneNumber: string;
  firstName: string;
  lastName: string;
  role: 'RESTAURANT';
}

interface CreateRestaurantOwnerResponse {
  success: boolean;
  message: string;
  data: {
    id: string;
    phoneNumber: string;
    status: string;
  } | null;
  errorCode: string | null;
  timestamp: unknown;
}

interface UpdateRestaurantDto {
  name: string;
  phoneNumber: string;
  country: string;
  city: string;
  district: string;
  street: string;
}

@Injectable({ providedIn: 'root' })
export class BackendRestaurantsRepository implements RestaurantsRepository {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = inject(BACKEND_API_URL).replace(/\/+$/, '');

  list(): Observable<Restaurant[]> {
    return this.http.get<BackendRestaurantDto[]>(`${this.baseUrl}/restaurants`).pipe(
      map(restaurants => restaurants.map(restaurant => this.toDomain(restaurant))),
    );
  }

  saveAll(restaurants: readonly Restaurant[]): Observable<void> {
    if (restaurants.some(restaurant => !this.hasBackendCreateContract(restaurant))) {
      return throwError(() => new Error(
        'L’import backend exige registrationNumber, ownerId, téléphone et adresse structurée pour chaque restaurant.',
      ));
    }

    return forkJoin(restaurants.map(restaurant => this.upsert(restaurant))).pipe(map(() => undefined));
  }

  upsert(restaurant: Restaurant): Observable<Restaurant> {
    if (restaurant.source === 'backend') {
      return this.http.put<BackendRestaurantDto>(
        `${this.baseUrl}/restaurants/${encodeURIComponent(restaurant.id)}`,
        this.toUpdateDto(restaurant),
      ).pipe(map(response => this.toDomain(response)));
    }

    if (!this.hasBackendCreateContract(restaurant)) {
      return throwError(() => new Error(
        'Le restaurant doit avoir un NINEA, un propriétaire backend, un téléphone et une adresse structurée.',
      ));
    }

    return this.resolveOwnerUserId(restaurant).pipe(
      switchMap(ownerUserId => this.http.post<BackendRestaurantDto>(
        `${this.baseUrl}/restaurants`,
        this.toCreateDto(restaurant, ownerUserId),
      )),
      map(response => this.toDomain(response)),
    );
  }

  private toDomain(dto: BackendRestaurantDto): Restaurant {
    const address = [dto.street, dto.district, dto.city, dto.country]
      .filter(Boolean)
      .join(', ');

    return {
      id: dto.id,
      name: dto.name,
      address,
      phone: dto.phoneNumber,
      totalTransactions: 0,
      totalVolume: 0,
      registrationDate: '',
      status: this.toDisplayStatus(dto.status),
      registrationNumber: dto.registrationNumber,
      ownerId: dto.ownerId,
      country: dto.country,
      city: dto.city,
      district: dto.district,
      street: dto.street,
      paymentEligibilityStatus: dto.paymentEligibilityStatus,
      source: 'backend',
    };
  }

  private toCreateDto(restaurant: Restaurant, ownerUserId: string): CreateRestaurantDto {
    return {
      name: restaurant.name,
      registrationNumber: restaurant.registrationNumber!,
      ownerUserId,
      ownerFirstName: restaurant.ownerFirstName ?? '',
      ownerLastName: restaurant.ownerLastName ?? '',
      ownerPhoneNumber: normalizePhone(restaurant.ownerPhoneNumber ?? ''),
      phoneNumber: normalizePhone(restaurant.phone!),
      country: restaurant.country!,
      city: restaurant.city!,
      district: restaurant.district ?? '',
      street: restaurant.street!,
    };
  }

  private toUpdateDto(restaurant: Restaurant): UpdateRestaurantDto {
    return {
      name: restaurant.name,
      phoneNumber: normalizePhone(restaurant.phone ?? ''),
      country: restaurant.country ?? '',
      city: restaurant.city ?? '',
      district: restaurant.district ?? '',
      street: restaurant.street ?? '',
    };
  }

  private hasBackendCreateContract(restaurant: Restaurant): boolean {
    const hasExistingOwner = !!restaurant.ownerId?.trim();
    const hasNewOwner = !!restaurant.ownerFirstName?.trim()
      && !!restaurant.ownerLastName?.trim()
      && !!restaurant.ownerPhoneNumber?.trim();

    return !!restaurant.registrationNumber?.trim()
      && (hasExistingOwner || hasNewOwner)
      && !!restaurant.phone?.trim()
      && !!restaurant.country?.trim()
      && !!restaurant.city?.trim()
      && !!restaurant.street?.trim();
  }

  private resolveOwnerUserId(restaurant: Restaurant): Observable<string> {
    if (restaurant.ownerId?.trim()) {
      return of(restaurant.ownerId.trim());
    }

    if (!restaurant.ownerFirstName?.trim()
      || !restaurant.ownerLastName?.trim()
      || !restaurant.ownerPhoneNumber?.trim()) {
      return throwError(() => new Error(
        'Le prénom, le nom et le téléphone du propriétaire sont requis par le user-service.',
      ));
    }

    const request: CreateRestaurantOwnerDto = {
      phoneNumber: normalizePhone(restaurant.ownerPhoneNumber),
      firstName: restaurant.ownerFirstName.trim(),
      lastName: restaurant.ownerLastName.trim(),
      role: 'RESTAURANT',
    };

    return this.http.post<CreateRestaurantOwnerResponse>(
      `${this.baseUrl}/users/restaurant`,
      request,
    ).pipe(
      map(response => {
        const ownerUserId = response.data?.id?.trim();
        if (!response.success || !ownerUserId) {
          throw new Error(response.message || 'Le user-service n’a pas retourné l’identifiant du propriétaire.');
        }
        return ownerUserId;
      }),
    );
  }

  private toDisplayStatus(status: BackendRestaurantDto['status']): Restaurant['status'] {
    if (status === 'ACTIVE') return 'Actif';
    if (status === 'SUSPENDED') return 'Suspendu';
    return 'En attente';
  }
}

function normalizePhone(value: string): string {
  const digits = value.replace(/\D/g, '');
  return digits.startsWith('221') && digits.length === 12 ? digits.slice(3) : digits;
}
