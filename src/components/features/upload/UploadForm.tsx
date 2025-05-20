import "../../../styles/features/upload/index.scss";

export default function UploadForm() {

    /**
     * TODO:
     * - Validate and upload files on the server at change
     * - Show preview of the cover 
     * - Show metadata of the file
     */
    return (
        <form className="upload-form" id="uploadForm">
            <h2 className="upload-form__title">Ajouter une nouvelle fiche de lecture</h2>

            <div className="upload-form__field">
                <label htmlFor="contributor">Votre nom</label>
                <input type="text" id="contributor" name="contributor" required placeholder="Entrez votre nom" />
            </div>
            
            <div className="upload-form__flex-wrapper">
                <div className="upload-form__cover-upload upload-form__field">
                    <label htmlFor="cover">Couverture</label>
                    <label htmlFor="cover">
                        <img src="https://placehold.co/200x300" alt="Ajouter une couverture" aria-label="Ajouter une couverture" />
                    </label>
                    <input type="file" id="cover" name="cover" required className="hidden" />
                </div>

                <div className="upload-form__file-upload upload-form__field">
                    <label htmlFor="file">Fichier</label>
                    <input type="file" id="file" name="file" required />
                </div>
            </div>

            <div className="upload-form__submit">
                <button type="submit" className="btn-action with-border">Ajouter</button>
            </div>
        </form>
    )
}