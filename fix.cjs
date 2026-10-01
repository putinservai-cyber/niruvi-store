const fs = require('fs');
let content = fs.readFileSync('src/context/AuthContext.tsx', 'utf8');
content = content.replace('    } catch (err: any) {\n    } catch (err: any) {', '    } catch (err: any) {');
fs.writeFileSync('src/context/AuthContext.tsx', content);
console.log("Fixed duplicate catch");
