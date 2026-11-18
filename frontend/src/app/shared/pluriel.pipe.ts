import { Pipe, PipeTransform } from '@angular/core';
import { plural } from '../core/utils/pluriel';

/** L69 — `{{ n | pluriel:'œuvre':'œuvres' }}` → « 1 œuvre », « 2 œuvres » (voir `plural`). */
@Pipe({ name: 'pluriel', standalone: true })
export class PlurielPipe implements PipeTransform {
  transform(n: number, one: string, many: string): string {
    return plural(n, one, many);
  }
}
