import { getProducts } from "../../_lib/product-queries";

export default async function DebugPage() {
  const { data: products } = await getProducts({
    page: 1,
    perPage: 10,
    category: [],
    status: [],
    price: [],
    createdAt: [],
    sort: [{ id: "createdAt", desc: true }],
  });

  return (
    <div className="container mx-auto py-6">
      <h1 className="text-2xl font-bold mb-4">Available Products</h1>
      <div className="space-y-2">
        {products.map((product) => (
          <div key={product.id} className="p-4 border rounded">
            <p><strong>ID:</strong> {product.id}</p>
            <p><strong>Name:</strong> {product.name}</p>
            <p><strong>Category:</strong> {product.category}</p>
            <p><strong>Status:</strong> {product.status}</p>
            <p><strong>Price:</strong> ${product.price}</p>
            <a 
              href={`/products/${product.id}/edit`}
              className="text-blue-500 hover:underline"
            >
              Edit this product
            </a>
          </div>
        ))}
      </div>
    </div>
  );
}

