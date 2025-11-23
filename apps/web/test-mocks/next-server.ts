/**
 * Mock for next/server module
 * 
 * This mock provides the NextResponse class for testing API routes
 * without requiring the full Next.js server environment.
 */

export class NextResponse {
  private _status: number;
  private _headers: Headers;
  private _body: any;

  constructor(body?: BodyInit | null, init?: ResponseInit) {
    this._body = body;
    this._status = init?.status || 200;
    this._headers = new Headers(init?.headers);
  }

  static json(data: any, init?: ResponseInit): NextResponse {
    const response = new NextResponse(JSON.stringify(data), {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        ...init?.headers,
      },
    });
    return response;
  }

  static redirect(url: string | URL, status?: number): NextResponse {
    return new NextResponse(null, {
      status: status || 307,
      headers: {
        Location: url.toString(),
      },
    });
  }

  static next(init?: ResponseInit): NextResponse {
    return new NextResponse(null, init);
  }

  get status(): number {
    return this._status;
  }

  get headers(): Headers {
    return this._headers;
  }

  async json(): Promise<any> {
    if (typeof this._body === 'string') {
      return JSON.parse(this._body);
    }
    return this._body;
  }

  async text(): Promise<string> {
    if (typeof this._body === 'string') {
      return this._body;
    }
    return JSON.stringify(this._body);
  }
}

export class NextRequest {
  private _url: string;
  private _method: string;
  private _headers: Headers;
  private _body: any;

  constructor(input: string | URL, init?: RequestInit) {
    this._url = input.toString();
    this._method = init?.method || 'GET';
    this._headers = new Headers(init?.headers);
    this._body = init?.body;
  }

  get url(): string {
    return this._url;
  }

  get method(): string {
    return this._method;
  }

  get headers(): Headers {
    return this._headers;
  }

  async json(): Promise<any> {
    if (typeof this._body === 'string') {
      return JSON.parse(this._body);
    }
    return this._body;
  }

  async text(): Promise<string> {
    if (typeof this._body === 'string') {
      return this._body;
    }
    return JSON.stringify(this._body);
  }
}
