# PDF and DOCX Embedding Research

## PDF Incremental Updates and Multiple Manifests

### Incremental Update Mechanism
PDF incremental updates provide a method to modify documents without affecting original content by appending changes to the end of the file. This approach saves time by avoiding complete file rewrites and minimizes data loss risk, making it particularly valuable for digitally signed documents where maintaining signature validity is crucial.

The incremental update process allows multiple digital signatures to coexist in a single PDF without invalidating previous signatures. This is achieved by ensuring that incremental updates don't modify any previously signed data, enabling the addition of new signatures while preserving the integrity of existing ones.

### Multiple Signature Implementation
PDF files support multiple digital signatures through incremental updates, allowing documents to be signed multiple times by different parties. Each signature covers the document state at the time of signing, creating a chain of provenance that tracks the document's evolution through various stages of approval or modification.

Critical implementation requirements include pre-allocating sufficient signature fields before the first signature, as adding new fields post-signature invalidates existing signatures. The document must accommodate all anticipated signatures from the initial creation to avoid this limitation.

### Technical Constraints and Best Practices
When implementing multiple signatures, modifications between signatures must adhere to the signature's modification policy. Incremental updates can modify the final rendered document in arbitrary ways, placing responsibility on validators to ensure all post-signature changes are legitimate according to the established modification policies.

Best practices include avoiding disallowed changes in incremental updates, using signature widget appearance streams rather than adding signature visualizations to page content, and ensuring that all modifications comply with the original signature's permissions and constraints.

## DOCX Package Structure and Manifest System

### ZIP-Based Architecture
DOCX files are fundamentally ZIP archives containing XML files organized in a standardized package structure. The format can be examined by renaming any .docx file to .zip and extracting its contents, revealing the underlying OOXML (Office Open XML) structure.

The package typically contains three main directories: **docProps** for document properties (title, author, creation date), **_rels** for relationship definitions between document parts, and **word** for main content including text, images, and formatting information.

### Manifest File System
OOXML uses multiple manifest files to define package structure and relationships:

**Content Types Manifest**: Every package requires [Content_Types].xml at the root, containing a comprehensive list of all content types for package parts. This manifest specifies data types for each part, enabling applications to properly read and write OOXML files according to format specifications.

**Relationships Manifest**: The package includes relationship parts defining connections between package components and external resources. Located in the _rels folder, these files separate relationships from content, facilitating relationship modifications without affecting source references to targets.

### Provenance Embedding Strategies
DOCX files support provenance embedding through several mechanisms within the ZIP package structure. Custom XML parts can be added to store provenance manifests while maintaining compatibility with existing Office applications. The relationships manifest system enables linking provenance data to specific document components.

Metadata embedding can occur through document properties in the docProps directory, custom XML parts registered in the content types manifest, or relationship definitions that reference external provenance stores. Each approach offers different levels of integration and preservation across document processing workflows.

### Security and Integrity Considerations
The OOXML manifest system presents important security implications for signed documents. OOXML doesn't sign content-types.xml directly and parses document.rels.xml before signing values rather than literal contents. This allows arbitrary files to be added to signed OOXML bundles post-signature.

Specific security concerns include the ability to add files like "people.xml" (author descriptions) after signing, potentially allowing content to override document rendering. These files can be rendered by Word without explicit references, creating opportunities for document modification that bypasses signature verification.

### ZIP Part Management
DOCX provenance implementation must consider ZIP package integrity and part management. Adding new parts requires updating both the content types manifest and appropriate relationship files. The order of parts within the ZIP archive and proper MIME type declarations ensure compatibility across different Office implementations.

Custom provenance parts should follow OOXML naming conventions and register appropriate content types to avoid conflicts with standard document components. Relationship types for provenance links should use custom namespaces to prevent interference with standard Office functionality.

## Implementation Recommendations

### PDF Provenance Strategy
For PDF implementations, leverage incremental updates to add provenance manifests without invalidating existing signatures. Pre-plan signature field allocation and establish clear modification policies for post-signature changes. Consider using PDF's attachment mechanism for external provenance manifests when embedding becomes impractical.

### DOCX Integration Approach
For DOCX files, utilize custom XML parts within the OOXML package structure for provenance data storage. Implement proper content type registration and relationship management to ensure compatibility. Design provenance embedding to survive common document processing operations while maintaining accessibility for verification tools.

### Cross-Format Considerations
Both formats require careful consideration of metadata preservation across processing workflows. Standard document operations may strip or modify embedded provenance data, necessitating robust verification strategies and fallback mechanisms for critical use cases.

## References

- [PDF Incremental Updates Guide - GrapeCity](https://www.grapecity.com/documents-api-pdf/docs/online/IncrementalUpdate.html)
- [Multiple PDF Digital Signatures - Stack Overflow](https://stackoverflow.com/questions/51232053/insert-multiple-digital-approval-signatures-without-invalidating-the-previous-on)
- [PDF Certification Attacks - iText PDF](https://itextpdf.com/blog/itext-news-technical-notes/attacks-pdf-certification-and-what-you-can-do-about-them)
- [OOXML Anatomy Guide](http://officeopenxml.com/anatomyofOOXML.php)
- [DOCX Structure Analysis - Medium](https://medium.com/@stefan.sommarsjo/structure-of-docx-files-xml-schema-file-organization-and-common-errors-c74d841a65e7)
- [WordprocessingML Document Structure - Microsoft Learn](https://learn.microsoft.com/en-us/office/open-xml/word/structure-of-a-wordprocessingml-document)
- [DOCX Format Specifications - Library of Congress](https://www.loc.gov/preservation/digital/formats/fdd/fdd000397.shtml)
- [OOXML Security Analysis - Hacker News](https://news.ycombinator.com/item?id=36295321)
- [PyHanko PDF Signing Documentation](https://pyhanko.readthedocs.io/en/latest/cli-guide/signing.html)