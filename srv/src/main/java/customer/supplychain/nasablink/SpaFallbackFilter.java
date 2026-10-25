package customer.supplychain.nasablink;

import java.io.IOException;

import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

/**
 * The NasabLink React app uses client-side routes (/nasablink/trees/123). Spring only serves real files from app/,
 * so any extension-less GET under /nasablink/ is forwarded to the SPA's index.html (reload / deep links).
 */
@Component
public class SpaFallbackFilter extends OncePerRequestFilter {

	private static final String PREFIX = "/nasablink/";

	@Override
	protected void doFilterInternal(HttpServletRequest req, HttpServletResponse res, FilterChain chain)
			throws ServletException, IOException {
		String path = req.getRequestURI();
		String last = path.substring(path.lastIndexOf('/') + 1);
		if ("GET".equals(req.getMethod()) && path.startsWith(PREFIX) && !last.contains(".")) {
			req.getRequestDispatcher(PREFIX + "index.html").forward(req, res);
			return;
		}
		chain.doFilter(req, res);
	}
}
