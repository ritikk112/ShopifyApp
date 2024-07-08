import {
  reactExtension,
  CustomerSegmentTemplate,
  useApi,
} from '@shopify/ui-extensions-react/admin';

// The target used here must match the target used in the extension's toml file (./shopify.extension.toml)
const TARGET = 'admin.customers.segmentation-templates.render';

export default reactExtension(TARGET, () => <App />);

function App() {
  // The useApi hook provides access to several useful APIs like i18n, close, and data.
  const { i18n } = useApi(TARGET);

  const query = 'number_of_orders = 1 AND products_purchased(id: (product_id)) = true';
  const queryToInsert = 'number_of_orders = 1 AND products_purchased(id: (';

  return (
    // The CustomerSegmentTemplate component provides an API for setting the title, description, date, query, and query to insert of the segmentation template.
    <CustomerSegmentTemplate
        title={i18n.translate('title')}
        description={i18n.translate('description')}
        createdOn={new Date('2023-08-15').toISOString()}
        query={query}
        queryToInsert={queryToInsert}
    />
  );
}