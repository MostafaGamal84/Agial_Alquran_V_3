import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class BuyNowLinkService {
  public buyNowLink: string;
  public queryString: string;

  setBuyNowLink(urlValue: URLSearchParams): void {
    const ispValue = urlValue.get('isp');

    if (ispValue === '1') {
      this.buyNowLink = 'https://1.envato.market/XYAZnb';
      this.queryString = '?isp=1';
    } else {
      this.buyNowLink = 'https://1.envato.market/zNkqj6';
      this.queryString = '';
    }
  }
}
