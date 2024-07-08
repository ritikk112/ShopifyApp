import { json } from "@remix-run/node";
import { useLoaderData, useSubmit, useNavigation, Form } from "@remix-run/react";
import {
  Page,
  Layout,
  Text,
  Card,
  BlockStack,
  Image,
  InlineStack,
  Select,
  Button,
} from "@shopify/polaris";
import { authenticate } from "../shopify.server";
import { useState } from "react";

export const loader = async ({ request }) => {
  const { admin } = await authenticate.admin(request);
  const url = new URL(request.url);
  const count = parseInt(url.searchParams.get("count") || "0", 10);
  const sortOrder = url.searchParams.get("sortOrder") || "random";

  // Only fetch if count and sortOrder are provided (i.e., Apply button was clicked)
  if (count === 0 && sortOrder === "random") {
    return json({ products: [], count, sortOrder });
  }

  try {
    const response = await admin.graphql(
      `query getProductsFromCollection($collectionId: ID!, $first: Int!) {
        collection(id: $collectionId) {
          products(first: $first) {
            edges {
              node {
                id
                title
                handle
                priceRange {
                  minVariantPrice {
                    amount
                    currencyCode
                  }
                }
                images(first: 1) {
                  edges {
                    node {
                      originalSrc
                      altText
                    }
                  }
                }
                metafield(namespace: "custom", key: "Review") {
                  value
                }
              }
            }
          }
        }
      }`,
      {
        variables: {
          collectionId: "gid://shopify/Collection/483580412193",
          first: 250 // Fetch up to 250 products
        },
      }
    );

    const responseJson = await response.json();
    
    if (responseJson.errors) {
      console.error("GraphQL Errors:", responseJson.errors);
      return json({ error: "Failed to fetch products" }, { status: 500 });
    }

    let products = responseJson.data.collection.products.edges.map(edge => {
      const product = edge.node;
      let rating = null;
      if (product.metafield && product.metafield.value) {
        try {
          const parsedValue = JSON.parse(product.metafield.value);
          rating = parseFloat(parsedValue.value);
        } catch (e) {
          console.error("Error parsing metafield value:", e);
        }
      }
      return { ...product, rating };
    });

    // Sort products based on sortOrder
    if (sortOrder === "ascending") {
      products.sort((a, b) => (a.rating || 0) - (b.rating || 0));
    } else if (sortOrder === "descending") {
      products.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    } else {
      // Random order
      products = products.sort(() => Math.random() - 0.5);
    }

    // Limit the number of products if count is specified
    if (count > 0) {
      products = products.slice(0, count);
    }

    return json({ products, count, sortOrder });
  } catch (error) {
    console.error("Error fetching products:", error);
    return json({ error: "Failed to fetch products" }, { status: 500 });
  }
};

export default function Index() {
  const { products, error, count: initialCount, sortOrder: initialSortOrder } = useLoaderData();
  const submit = useSubmit();
  const navigation = useNavigation();

  const [count, setCount] = useState(initialCount.toString());
  const [sortOrder, setSortOrder] = useState(initialSortOrder);

  const handleApply = (event) => {
    event.preventDefault();
    const formData = new FormData(event.target);
    formData.set("count", count);
    formData.set("sortOrder", sortOrder);
    submit(formData, { method: "get", replace: true });
  };

  const isLoading = navigation.state === "loading";

  if (error) {
    return (
      <Page>
        <Layout>
          <Layout.Section>
            <Card>
              <BlockStack gap="400">
                <Text as="h2" variant="headingMd">
                  Error
                </Text>
                <Text>{error}</Text>
              </BlockStack>
            </Card>
          </Layout.Section>
        </Layout>
      </Page>
    );
  }

  return (
    <Page>
      <Layout>
        <Layout.Section>
          <Card>
            <BlockStack gap="500">
              <Text as="h2" variant="headingMd">
                Products Sorted by Review Rating
              </Text>
              <Form onSubmit={handleApply}>
                <InlineStack gap="300">
                  <Select
                    label="Number of products"
                    options={[
                      {label: 'All', value: '0'},
                      {label: '5', value: '5'},
                      {label: '10', value: '10'},
                      {label: '15', value: '15'},
                      {label: '20', value: '20'},
                    ]}
                    onChange={setCount}
                    value={count}
                  />
                  <Select
                    label="Sort order"
                    options={[
                      {label: 'Random', value: 'random'},
                      {label: 'Best rated first', value: 'descending'},
                      {label: 'Worst rated first', value: 'ascending'},
                    ]}
                    onChange={setSortOrder}
                    value={sortOrder}
                  />
                  <Button submit loading={isLoading}>Apply</Button>
                </InlineStack>
              </Form>
              {products && products.length > 0 ? (
                products.map(product => (
                  <InlineStack key={product.id} gap="200" align="center">
                    {product.images.edges.length > 0 && (
                      <Image
                        source={product.images.edges[0].node.originalSrc}
                        alt={product.images.edges[0].node.altText || product.title}
                        width={100}
                        height={100}
                      />
                    )}
                    <BlockStack>
                      <Text variant="bodyMd">{product.title}</Text>
                      <Text variant="bodySm">
                        Price: {product.priceRange.minVariantPrice.amount/100} {product.priceRange.minVariantPrice.currencyCode}
                      </Text>
                      <Text variant="bodySm">
                        Rating: {product.rating !== null ? product.rating : 'No rating'}/5
                      </Text>
                    </BlockStack>
                  </InlineStack>
                ))
              ) : (
                <Text>No products found. Please apply filters to see products.</Text>
              )}
            </BlockStack>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}