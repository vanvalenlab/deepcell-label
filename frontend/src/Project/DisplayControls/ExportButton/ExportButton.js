import DownloadButton from './DownloadButton';
import SubmitButton from './SubmitButton';

function ExportButton() {
  const search = new URLSearchParams(window.location.search);
  const download = search.get('download');

  return download ? (
    <DownloadButton sx={{ width: '100%' }} />
  ) : (
    <SubmitButton sx={{ width: '100%' }} />
  );
}

export default ExportButton;
