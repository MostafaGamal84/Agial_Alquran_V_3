import { MatSelect } from '@angular/material/select';

import { normalizeSelectCompare } from './select-compare';

export function applyDefaultMatSelectCompare() {
  return () => {
    const prototype = MatSelect.prototype as MatSelect & { _normalizedComparePatched?: boolean };

    if (prototype._normalizedComparePatched) {
      return;
    }

    const originalNgOnInit = prototype.ngOnInit;

    prototype.ngOnInit = function (...args: unknown[]) {
      if (!this.compareWith) {
        this.compareWith = normalizeSelectCompare;
      }

      return originalNgOnInit ? originalNgOnInit.call(this) : undefined;
    };

    prototype._normalizedComparePatched = true;
  };
}
