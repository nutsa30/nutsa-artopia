// types.ts

export type Product = {
  id: number;
  name: string;
  slug: string;

  category_id?: number;
  category_name?: string;
  category?: string;

  price: number;
  sale?: number;

  quantity?: number;
  description?: string;

  image_url1?: string | null;
  image_url2?: string | null;
  image_url3?: string | null;
  image_url4?: string | null;
  image_url5?: string | null;
  image_url6?: string | null;

  is_new?: boolean;
  hide?: boolean;
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
