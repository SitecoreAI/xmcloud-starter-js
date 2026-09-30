export default function NoDataFallback({ componentName }: { componentName: string }) {
  return <div className="allianz-missing-data" role="status">Add a datasource for {componentName}.</div>;
}
