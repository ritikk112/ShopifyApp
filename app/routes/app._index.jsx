import { json } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import {
  Page,
  Layout,
  Text,
  Card,
  BlockStack,
  Image,
  InlineStack,
} from "@shopify/polaris";
import { authenticate } from "../shopify.server";

export const loader = async ({ request }) => {
  const { admin } = await authenticate.admin(request);

  try {
    const response = await admin.graphql(
      `query getProducts($first: Int!) {
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
      }`,
      {
        variables: {
          first: 10 // Adjust based on your needs
        },
      }
    );

    const responseJson = await response.json();
    
    if (responseJson.errors) {
      console.error("GraphQL Errors:", responseJson.errors);
      return json({ error: "Failed to fetch products" }, { status: 500 });
    }

    const products = responseJson.data.products.edges.map(edge => {
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

    // Sort products by rating in ascending order
    products.sort((a, b) => (b.rating || 0) - (a.rating || 0));

    return json({ products });
  } catch (error) {
    console.error("Error fetching products:", error);
    return json({ error: "Failed to fetch products" }, { status: 500 });
  }
};

export default function Index() {
  const { products, error } = useLoaderData();

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
                <Text>No products found.</Text>
              )}
            </BlockStack>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}