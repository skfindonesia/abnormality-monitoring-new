import DataTable from "./components/DataTable";
import styles from "./page.module.css";

export default function Home() {
  return (
    <div className={styles.page}>
      <main className={styles.main}>
        <div className={styles.header}>
          <img 
            src="/SKF_logotype_blue_RGB.png" 
            alt="SKF Logo" 
            className={styles.headerLogo}
          />
          <h1>ABNORMALITY MONITORING</h1>
        </div>
        <DataTable />
      </main>
    </div>
  );
}
