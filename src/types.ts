// types.ts
export type Subcategory = {
  id: number;
  category: string;
  name: string;
  is_active: boolean;
};

export type Product = {
  id: number;
  title_ka: string;
  title_en?: string;
  category: string;           // იბრუნებს GET /products/{id}
  subcategory?: string | null; // იბრუნებს GET /products/{id}
  price: number;
  sale?: number;
  // ...
};

export type OrderCreatePayload = {
  items: Array<{ product_id: number; qty: number }>;
  customer: {
    name: string;
    phone: string;
    city: string;
    address: string;
    email?: string;
  };
  comment?: string; // ✅ ახალი არა-სავალდებულო ველი
  // სხვა ველები რაც უკვე გაქვთ...
};

export type OrderResponse = {
  order_id: string;
  comment?: string; // ✅ დაბრუნდება როგორც დეტალის ნაწილი
  // ...
};
